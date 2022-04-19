
import json
import csv
import time
import numpy as np
from pathlib import Path
from threading import Thread
from datetime import datetime
from .database import job2list, job_fields, ClusterEstimationDataset

class CronJob:
    def __init__(self, delay=3600, job=None) -> None:
        self.running = False
        self.delay = delay
        self.job = job

    def update(self):
        while self.running:
            time.sleep(self.delay)
            print("Running cronjob: ", datetime.now().strftime("%d/%m/%Y %H:%M:%S"))
            self.run_job()

    def start(self):
        if self.delay > 0:
            self.running = True
            Thread(target=self.update, args=()).start()

    def stop(self):
        self.running = False

    def run_job(self):
        if self.job: self.job()

class BatchManager:
    def __init__(self, db_config, dataset_path, batch_size, reset, sanity_check_path, n_sanity_checks, n_participants_per_job) -> None:
        super().__init__()
        ClusterEstimationDataset.init_db(db_config)
        self.manager = ClusterEstimationDataset(
            dataset_path=dataset_path, 
            batch_size=batch_size, 
            sanity_check_path=sanity_check_path,
            n_sanity_checks=n_sanity_checks,
            n_participants_per_job=n_participants_per_job,
            reset=reset)

    def write_output(self, output):  
        def job2json(job):
            error = abs(float(job.ground_truth['slope']) - float(job.annotation['slope']))
            return {"index": job.index, "uuid": batch.uuid, "name": job.name, "validation": job.validation, "abserror": error, "ground_truth": job.ground_truth['slope'], "annotation": job.annotation['slope']}          
        output = Path(output).resolve()
        output.mkdir(parents=True, exist_ok=True)
        with open(output/"result.csv", 'w', newline='') as csvfile:
            spamwriter = csv.writer(csvfile, delimiter=';', quotechar='|', quoting=csv.QUOTE_MINIMAL)
            spamwriter.writerow(job_fields())
            for batch in self.manager.get_batches_completed():
                for job in self.manager.get_jobs_batch(batch.uuid):
                    spamwriter.writerow(job2list(job))

        with open(output/"result2.json", 'w', newline='') as jsonfile:
            data = {}
            for batch in self.manager.get_batches_completed():
                jobs = self.manager.get_jobs_batch(batch.uuid)
                
                l = [job2json(j) for j in jobs]
                l = sorted(l, key=lambda e:float(e['abserror']))
                errors       = [abs(float(v["ground_truth"]) - float(v["annotation"])) for v in l if not v["validation"] ]
                errors_valid = [abs(float(v["ground_truth"]) - float(v["annotation"])) for v in l if v["validation"] ]

                if len(errors) <= 0 or len(errors_valid) <= 0: continue
                data[batch.uuid] = {}
                data[batch.uuid]["mturkid"] = batch.mturkId
                data[batch.uuid]["failed"] = batch.failed
                data[batch.uuid]["abserror"] = np.mean(errors)
                data[batch.uuid]["stddev"] = np.std(errors)
                data[batch.uuid]["abserror_valid"] = np.mean(errors_valid)
                data[batch.uuid]["stddev_valid"] = np.std(errors_valid)
                data[batch.uuid]["jobs"] = l
            json.dump(data, jsonfile, indent=4)


    def clean(self):
        return self.manager.clean_failed_jobs()
    
    def progress(self):
        return self.manager.progress()

    def failed(self):
        return self.manager.failed()

    def remove_timed_out_jobs(self):
        return self.manager.remove_timed_out_jobs(duration=self.batch_max_age)

    def get_next(self, uuid):
        batch = self.manager.get_next(uuid)
        if len(batch) <=0: print("No new Jobs!")
        return batch

    def submit(self, uuid, name, data):
        return self.manager.submit(uuid, name, data)

    def image(self, name):
        path = self.manager.get_image_path(name)
        assert path.is_file(), "Cannot find " + path
        return path.as_posix()

    def user_finished(self, uuid):
        return self.manager.user_finished(uuid)