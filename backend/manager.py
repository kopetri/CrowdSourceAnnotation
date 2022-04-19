
import time
from threading import Thread
from datetime import datetime
from .database import SampleDataset

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
    def __init__(self, db_config, jobs_file, batch_size, reset, n_sanity_checks, n_annotators_per_job) -> None:
        super().__init__()
        SampleDataset.init_db(db_config)
        self.manager = SampleDataset(
            jobs_file=jobs_file, 
            batch_size=batch_size, 
            n_sanity_checks=n_sanity_checks,
            n_annotators_per_job=n_annotators_per_job,
            reset=reset)

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