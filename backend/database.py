
from pathlib import Path
from uuid import uuid1
import time
from pony.orm import Database, Required, db_session, select, Json, Set, Optional
import numpy as np
import json
from tqdm import tqdm

########################### Don't change this code #########################################
db = Database()

class Batch(db.Entity):
    uuid = Optional(str)
    progress = Optional(int)
    mturkId = Required(str)
    failed = Required(bool)
    completed  = Required(bool)
    creation_date = Optional(float)
    jobs = Set('Job')

class Job(db.Entity):
    index = Required(int)
    name = Required(str)
    is_sanity_check = Required(bool)
    data = Optional(Json)
    annotation = Optional(Json)
    owner = Optional(Batch)


class BaseDatabaseManager: 
    def __init__(self, jobs_file, batch_size, n_annotators_per_job=3, n_sanity_checks=0, reset=False) -> None:
        super().__init__()
        self.batch_size = batch_size
        self.jobs_file = jobs_file
        self.n_sanity_checks = n_sanity_checks
        self.n_annotators_per_job = n_annotators_per_job
        if reset:
            self.reset_database()
        batches = self.get_batches()
        jobs = self.get_jobs()
        print("Found {} jobs.".format(len(jobs)))
        print("Found {} batches.".format(len(batches)))

    def get_image_path(self, name):
        raise NotImplementedError()

    def submit_annotation(self, job, data):
        raise NotImplementedError()

    @db_session
    def sanity_check(self, uuid):
        raise NotImplementedError()

    def add_job(self, data):
        raise NotImplementedError()

    @db_session
    def job2json(self, batch, job):
        raise NotImplementedError()

    @db_session
    def batch2json(self, batch):
        return [self.job2json(batch, job) for jIdx, job in enumerate(sorted(batch.jobs, key=lambda j:j.index)) if jIdx >= batch.progress]

    @db_session
    def submit(self, uuid, name, data):
        batch = self.get_batch_user(uuid)
        if len(batch) == 0: return False
        if len(batch) == 1:
            batch = batch[0]
            job = [j for j in batch.jobs if j.name == name]
            if job:
                [job] = job
                self.submit_annotation(job, data)
                batch.set(progress=batch.progress + 1)
                return True
        return False

    @db_session
    def progress(self):
        batches = self.get_batches()
        N = len(batches)
        complete = 0
        pending = 0
        failed = 0
        for b in batches:
            if b.completed and not b.failed: 
                complete +=1
            elif b.completed and b.failed: 
                failed +=1
            elif b.creation_date: 
                pending += 1
        return {"complete": complete, 'pending': pending, 'failed': failed, 'total': N}

    @db_session
    def failed(self):
        batches = self.get_batches()
        failed = []
        for b in batches:
            if b.completed and b.failed: 
                failed.append(b.mturkId)
            
        return {"mturkid": failed}

    @db_session
    def clean_failed_jobs(self):
        batches = self.get_batches()
        n = 0
        for b in batches:
            if b.completed and b.failed: 
                for job in b.jobs:
                    job.set(annotation={})
                b.set(creation_date=None, uuid="", mturkId=uuid1().hex, failed=False, completed=False, progress=0)
                n += 1    
        return {"cleaned": n}
    
    @db_session
    def add_batch(self, jobs):
        batch = Batch(mturkId=uuid1().hex, completed=False, failed=False)
        for job in jobs:
            batch.jobs.add(job)
        return batch
    
    @db_session
    def get_jobs(self):
        return list(select(j for j in Job))
    @db_session
    def get_batches_completed(self):
        batches = []
        for batch in self.get_batches():
            if batch.completed:
                batches += [batch]
        return batches
    @db_session
    def get_jobs_batch(self, uuid):
        return list(select(j for j in Job if j.owner.uuid == uuid))
    @db_session
    def get_annotations(self):
        return list(select(j for j in Job))
    @db_session
    def get_batches(self):
        return list(select(b for b in Batch))
    @db_session
    def get_batch_user(self, uuid):
        return list(select(b for b in Batch if b.uuid == uuid))
    @db_session
    def assign(self, uuid):
        if uuid == "":return []
        batches = list(select(b for b in Batch if not b.uuid))
        if len(batches) == 0: return [{"index": 0, "uuid": uuid, "name": "out_of_data", "validation": False, "data": {}}]
        [batch] = np.random.choice(batches, size=1)
        batch.set(uuid=uuid, creation_date=time.time(), progress=0)
        return self.batch2json(batch)
    @db_session
    def get_next(self, uuid):
        batch = self.get_batch_user(uuid)
        if batch: 
            return self.batch2json(batch[0])
        else:
            return self.assign(uuid)

    @db_session
    def remove_timed_out_jobs(self, duration=3600):
        print("Removing jobs older than {} seconds.".format(duration))
        i = 0
        for batch in select(b for b in Batch if not b.completed and not b.creation_date is None):
            age = time.time() - batch.creation_date
            if age < duration: continue
            i += 1
            batch.set(uuid="", progress=None, mturkId=batch.mturkId, failed=False, completed=False, creation_date=None)
            for job in batch.jobs:
                job.annotation = {}
        if i > 0: print("Reset {} timed out jobs.".format(i))
        return i

    @db_session
    def user_finished(self, uuid):
        def __check(uuid):
            batch = self.get_batch_user(uuid)
            if len(batch) == 0: return False
            if len(batch) == 1:
                self.sanity_check(uuid)
            return False
        batch = list(select(b for b in Batch if b.uuid == uuid))
        if len(batch) == 0: return "Session expired!"
        
        success = __check(uuid)
        batch = batch[0]
        completed = all([bool(job.annotation) for job in batch.jobs])
        batch.set(completed=completed, failed=not success)
        return batch.mturkId if completed else "Not complete!"
    
    @db_session
    def reset_database(self):
        batches = self.get_batches()
        if batches:
            print("Deleting {} batches.".format(len(batches)))
            for batch in batches:
                batch.delete()
            jobs = self.get_jobs()
            print("Deleting {} jobs.".format(len(jobs)))
            for job in jobs:
                job.delete()

        with open(self.jobs_file, "r") as jsonfile:
            data_list = json.load(jsonfile)
            targets       = [d for d in data_list if not d["is_sanity_check"]]
            sanity_checks = [d for d in data_list if d["is_sanity_check"]]
        
        for i in range(self.n_annotators_per_job):
            jobs = []
            for data in tqdm(targets, desc="sync jobs for Annotator {}/{}.".format(i+1, self.n_annotators_per_job)):
                jobs.append(self.add_job(data))
            jobs = np.array(jobs)
            np.random.shuffle(jobs)
            
            n_jobs = len(jobs)
            n_batches = (n_jobs // self.batch_size) 
            
            batched_jobs = np.array(jobs[0:n_batches * self.batch_size]).reshape((n_batches, self.batch_size)).tolist()
            for batch in tqdm(batched_jobs, "add batches"):
                if sanity_checks and self.n_sanity_checks > 0:
                    batch += [self.add_job(data) for data in np.random.choice(sanity_checks, size=self.n_sanity_checks, replace=False)]
                self.add_batch(batch)
            
            
            remaining_jobs = np.array(jobs[n_batches * self.batch_size:]).tolist()
            if len(remaining_jobs) > 0:
                if sanity_checks and self.n_sanity_checks > 0:
                    remaining_jobs += [self.add_job(data) for data in np.random.choice(sanity_checks, size=self.n_sanity_checks, replace=False)]
                self.add_batch(remaining_jobs)
            

    @staticmethod
    def init_db(config):
        db.bind(config)
        db.generate_mapping(create_tables=True)

########################################################################################










########################### This class can be changed if necessary #####################
class SampleDataset(BaseDatabaseManager):
    def __init__(self, jobs_file, batch_size, n_annotators_per_job, n_sanity_checks, reset) -> None:
        super().__init__(jobs_file, batch_size, n_annotators_per_job, n_sanity_checks, reset)

    def get_image_path(self, filename):
        # Make sure correct file is loaded from disc for a given image name
        return Path(self.jobs_file).parent/filename

    def submit_annotation(self, job, data):
        # Maybe preprocess data in to a proper annotation.
        job.annotation = data

    @db_session
    def sanity_check(self, uuid):
        # TODO Iterate over annotations given by user with uuid and check if he passes sanity checks.
        return True

    @db_session
    def add_job(self, data):
        # Check if data needs to be preprocessed before stored as Job.
        data = data["stimuli"]
        return Job(index=np.random.randint(1000000), name=str(data["id"]), is_sanity_check=data["is_sanity_check"], data=data)

    @db_session
    def job2json(self, batch, job):
        # Update fields as needed. This is the Json data exposed to the frontend.
        return {
            "index": job.index, 
            "uuid": batch.uuid, 
            "name": job.name, 
            "is_sanity_check": job.is_sanity_check, 
            "data": job.data
            }