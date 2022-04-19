
from pathlib import Path
from re import I
from uuid import uuid1
import time
from pony.orm import Database, Required, db_session, select, Json, Set, Optional
import numpy as np
import json
from tqdm import tqdm
import h5py

def chamfer_distance(S1, S2):
    def __cdist(S1, S2):
        N = S1.shape[0]
        M = S2.shape[0]
        C = S1.shape[-1]
        X = S1.repeat(M, 0)
        
        Y = np.tile(S2, (N,1))

        diff = (X-Y).reshape((N, M, C))
        dist = np.linalg.norm(diff, axis=-1)
        minimum = np.min(dist, axis=-1)
        return np.sum(minimum, axis=-1)

    return np.sum(__cdist(S1, S2) + __cdist(S2, S1))

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
    validation = Required(bool)
    ground_truth = Required(Json)
    annotation = Optional(Json)
    owner = Optional(Batch)

class VisualDesign:
    def __init__(self, path) -> None:
        self.path = Path(path)
        self.scores = []

    def to_json(self):
        return {"name": self.path.stem, "path": self.path.as_posix(), 'scores': self.scores}

def job_fields():
    return ["index", "name", "validation", "ground_truth", "annotation"]

def job2list(job):
    return [int(job.index), job.name, int(job.validation), str(job.ground_truth['slope']).replace(".", ","), str(job.annotation['slope']).replace(".", ",")]

class BaseDatabaseManager: 
    def __init__(self, dataset_path, batch_size, n_participants_per_job=1, sanity_check_path=None, n_sanity_checks=0, reset=False) -> None:
        super().__init__()
        self.batch_size = batch_size
        self.n_participants_per_job = n_participants_per_job
        self.data = self.get_data(dataset_path)
        self.sanity_checks = []
        self.n_sanity_checks = 0
        if sanity_check_path:
            self.sanity_checks = self.get_sanity_check_data(sanity_check_path)
            self.n_sanity_checks = n_sanity_checks
        if reset:
            self.reset_database()
        batches = self.get_batches()
        jobs = self.get_jobs()
        print("Found {} jobs.".format(len(jobs)))
        print("Found {} batches.".format(len(batches)))

    def get_data(self, path):
        raise NotImplementedError()

    def get_sanity_check_data(self, path):
        raise NotImplementedError()

    def get_image_path(self, name):
        raise NotImplementedError()

    def submit_annotation(self, job, data):
        raise NotImplementedError()

    @db_session
    def validation_check(self, uuid):
        raise NotImplementedError()

    def add_job(self, data):
        raise NotImplementedError()

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
    def batch2json(self, batch):
        return [{"index": job.index, "uuid": batch.uuid, "name": job.name, "validation": job.validation, "ground_truth": job.ground_truth} for jIdx, job in enumerate(sorted(batch.jobs, key=lambda j:j.index)) if jIdx >= batch.progress]
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
        if len(batches) == 0: return [{"index": 0, "uuid": uuid, "name": "out_of_data", "validation": False, "ground_truth": {}}]
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
        batch = list(select(b for b in Batch if b.uuid == uuid))
        if len(batch) == 0: return "Session expired!"
        success = self.validation_check(uuid)
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
        
        for _ in range(self.n_participants_per_job):
            jobs = []
            for data in tqdm(self.data, desc="sync jobs..."):
                jobs.append(self.add_job(data))
            jobs = np.array(jobs)
            np.random.shuffle(jobs)
            
            n_jobs = len(jobs)
            n_batches = (n_jobs // self.batch_size) 
            
            batched_jobs = np.array(jobs[0:n_batches * self.batch_size]).reshape((n_batches, self.batch_size)).tolist()
            for batch in tqdm(batched_jobs, "add batches"):
                if self.sanity_checks:
                    batch += [self.add_job(data) for data in np.random.choice(self.sanity_checks, size=self.n_sanity_checks, replace=False)]
                self.add_batch(batch)
            
            
            remaining_jobs = np.array(jobs[n_batches * self.batch_size:]).tolist()
            if len(remaining_jobs) > 0:
                if self.sanity_checks:
                    remaining_jobs += [self.add_job(data) for data in np.random.choice(self.sanity_checks, size=self.n_sanity_checks, replace=False)]
                self.add_batch(remaining_jobs)
            

    @staticmethod
    def init_db(config):
        db.bind(config)
        db.generate_mapping(create_tables=True)


class DatabaseManager(BaseDatabaseManager): 
    def __init__(self, dataset_path, batch_size, n_participants_per_job=1, sanity_check_path=None, n_sanity_checks=0, reset=False, sanity_threshold=0.1) -> None:
        super().__init__(dataset_path, batch_size, n_participants_per_job, sanity_check_path, n_sanity_checks, reset)
        self.sanity_threshold = sanity_threshold

    def get_data(self, path):
        return [img for img in Path(path).glob('*') if img.suffix == '.jpg']

    def get_sanity_check_data(self, path):
        return [img for img in Path(path).glob('*') if img.suffix == '.jpg']

    def get_image_path(self, name):
        for path in self.data:
            if path.stem == name:
                return path
        for path in self.sanity_checks:
            if path.stem == name:
                return path
        return None

    def submit_annotation(self, job, data):
        job.annotation = {'slope': data["slope"]}

    @db_session
    def validation_check(self, uuid):
        errors = []
        batch = self.get_batch_user(uuid)
        if len(batch) == 0: return False
        if len(batch) == 1:
            batch = batch[0]
            for job in batch.jobs:
                if job.validation:
                    gt   = float(job.ground_truth["slope"])
                    anno = float(job.annotation["slope"])
                    errors.append(abs(gt - anno))
            error = np.mean(errors)
            return error <= self.sanity_threshold
        return False

    @db_session
    def poor_quality(self, batch):
        def to_degree(value):
            return np.rad2deg((float(value) / 2) * (np.pi / 2))
        if batch.failed: return True        
        failed = 0
        for job in batch.jobs:
            stddev = float(job["name"].split("_")[0].replace("stddev", ""))
            gt   = float(job.ground_truth["slope"])
            anno = float(job.annotation["slope"])
            abserror = abs(gt - anno)
            if to_degree(abserror) >= 20 and stddev < 0.11:
                failed += 1
        return failed >= 5

    @db_session
    def add_job(self, path):
        slope = float(path.stem.split("_")[1].replace("slope",""))
        stddev = float(path.stem.split("_")[0].replace("stddev",""))
        return Job(index=np.random.randint(1000000), name=path.stem, validation="check" in path.stem, ground_truth={"slope": slope, "stddev": stddev})


class ClusterEstimationDataset(BaseDatabaseManager):
    def __init__(self, dataset_path, batch_size, n_participants_per_job=1, sanity_check_path=None, n_sanity_checks=0, reset=False) -> None:
        super().__init__(dataset_path, batch_size, n_participants_per_job, sanity_check_path, n_sanity_checks, reset)

    def get_data(self, path):
        return [img for img in Path(path).glob('*') if img.suffix == '.jpg']

    def get_sanity_check_data(self, path):
        return [img for img in Path(path).glob('*') if img.suffix == '.jpg']

    def get_image_path(self, name):
        for path in self.data:
            if path.stem == name:
                return path
        for path in self.sanity_checks:
            if path.stem == name:
                return path
        return None

    def submit_annotation(self, job, data):
        def normalize_pixel_centers(center, canvas_dims):
            x, y = center['x'], center['y']
            return [x / canvas_dims, 1 - (y / canvas_dims)]
        annotation = data['annotation']
        try:
            job.annotation = int(annotation)
        except:
            # normalize centers
            canvas_dims = data['canvas_dims']
            job.annotation = [normalize_pixel_centers(c, canvas_dims) for c in annotation]

    @db_session
    def validation_check(self, uuid):
        batch = self.get_batch_user(uuid)
        if len(batch) == 0: return False
        if len(batch) == 1:
            batch = batch[0]
            chamfer_dist = np.mean([chamfer_distance(np.array([v for v in job.annotation]), np.array([v for v in job.ground_truth['center']])) for job in batch.jobs if not job.validation])
            print("User {} finished with chamfer distance: {}".format(uuid, chamfer_dist))
            return chamfer_dist < 0.6
        return False

    @db_session
    def add_job(self, path):
        json_path = path.parents[1] / "meta" / "{}.json".format(path.stem)
        h5py_path = path.parents[1] / "pcd" / "{}.h5".format(path.stem.split('_')[0])
        dataset = h5py.File(h5py_path)
        with open(json_path, "r") as jsonfile:
            data = json.load(jsonfile)
        data['center'] = [x.tolist() for x in dataset['center']]
        dataset.close()
        return Job(index=np.random.randint(1000000), name=path.stem, validation="sanity" in path.stem, ground_truth=data)