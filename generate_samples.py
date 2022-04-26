
from argparse import ArgumentParser
import json
import os
from pathlib import Path
import random
import shutil

import cv2
import numpy as np

def create_sample(equirectangular, grid, pitch, yaw):

    pitch = np.radians(pitch)
    yaw = np.radians(yaw)
    # Since distortion increases to the edges of the image, rotation must be done beforehand
    pitch_matrix = np.array([   [1,     0,              0],
                                [0,     np.cos(pitch),  -np.sin(pitch)],
                                [0,     np.sin(pitch),  np.cos(pitch)]])
    uvz = grid @ pitch_matrix.T

    u = uvz[:, :, 0]
    v = uvz[:, :, 1]
    z = uvz[:, :, 2]
    # Use arctan to get latitude
    x = ((np.arctan2(u, z) + yaw) / (2 * np.pi) + 0.5) * equirectangular.shape[1]

    # Use arcsin to get longitude
    norm = np.linalg.norm(uvz, axis=-1, keepdims=True)[:, :, 0] # hypotenuse needed for sin
    y = (np.arcsin(v / norm) / (np.pi) + 0.5) * equirectangular.shape[0]

    # Use image remapping to get rid of any kind of distortion
    persp = cv2.remap(np.asarray(equirectangular), x.astype(np.float32), y.astype(np.float32), cv2.INTER_CUBIC, borderMode=cv2.BORDER_WRAP)
    persp = cv2.rotate(persp, cv2.ROTATE_90_CLOCKWISE)
    persp = cv2.flip(persp, 1)
    return persp

def create_job(source, destination, fov, aspect, yaw_difference, is_sanity_check):
    # Degree to radians
    fov = np.radians(fov)
    # Load an equirectangular image
    equirectangular = cv2.imread(source.as_posix())
    # Get shape of the image
    res0, res1 = equirectangular.shape[1], equirectangular.shape[0]
    # Create an array with size of the target image and values in [-1, 1][-1/ASPECT_RATIO, -1/ASPECT_RATIO]
    u, v = np.mgrid[-1:1:2/(res1 * aspect), -1/aspect:1/aspect:2/(res1 * aspect)]
    # Create z values with respect to FoV
    z = np.ones_like(u) * 1 / np.tan(fov / 2)

    uvz = np.asarray([u, v, z])
    uvz = np.moveaxis(uvz, 0, -1)

    if not is_sanity_check:
        # Define exclude ranges
        exclude = []
        for i in range(3):
            pitch = random.randrange(-30, 31)
            yaw = random.choice([i for i in range(0, 360) if not any([i in exclude_range for exclude_range in exclude])])
            if yaw < yaw_difference:
                exclude_ranges = [range(360 + yaw - yaw_difference, 360), range(0, yaw + yaw_difference)]
            elif yaw > 360 - yaw_difference:
                exclude_ranges = [range(yaw - yaw_difference, 360), range(0, yaw + yaw_difference - 360)]
            else:
                exclude_ranges = [range(yaw - yaw_difference, yaw + yaw_difference)]
            exclude.extend(exclude_ranges)
            print('Create sample {} with pitch={} and yaw={}'.format(i, pitch, yaw))
            sample = create_sample(equirectangular, uvz, pitch, yaw)
            cv2.imwrite((destination.as_posix() + '_sample_{}.jpg'.format(i)), sample)
    else:
        pitch = 0
        yaw = 0
        sample = create_sample(equirectangular, uvz, pitch, yaw)
        cv2.imwrite((destination.as_posix() + '_sample_{}.jpg'.format(0)), sample)
        pitch = 80
        yaw = 0
        sample = create_sample(equirectangular, uvz, pitch, yaw)
        cv2.imwrite((destination.as_posix() + '_sample_{}.jpg'.format(1)), sample)
        pitch = -80
        yaw = 0
        sample = create_sample(equirectangular, uvz, pitch, yaw)
        cv2.imwrite((destination.as_posix() + '_sample_{}.jpg'.format(2)), sample)





def create_jobs(path, fov, aspect, yaw_difference, sanity_check_rate):

    job_counter = 0
    for child in path.iterdir():
        if child.is_file() and child.suffix in ['.png', '.jpg', '.gif', '.jpeg', '.avif']:
            job_path = Path('./sample_data/job_{}'.format(job_counter))
            while Path(job_path.as_posix() + '_sample_0.jpg').exists():
                job_counter += 1
                job_path = Path('./sample_data/job_{}'.format(job_counter))
            print('\nCreate job {}'.format(job_counter))
            is_sanity_check = job_counter % sanity_check_rate == 0
            create_job(child, job_path, fov, aspect, yaw_difference, is_sanity_check)
            with open('./sample_data/jobs.json') as f:
                jobs = json.load(f)
                job = {
                    'id': job_counter,
                    'stimuli': ['job_{}_sample_{}.jpg'.format(job_counter, i) for i in range(3)],
                    'is_sanity_check': is_sanity_check
                }
                jobs.append(job)
            with open('./sample_data/jobs.json', 'w') as f:
                json.dump(jobs, f)
        elif child.is_dir():
            create_jobs(child, fov, aspect, yaw_difference, sanity_check_rate)


def main():
    arg_parse = ArgumentParser()
    arg_parse.add_argument('-p', '--dataset_path', required=True, help='The path of 360 degree images')
    arg_parse.add_argument('-c', '--clear', action='store_true', help='Clear the samples folder')
    arg_parse.add_argument('-f', '--fov', default=90, help='The field of view angle for the sample images')
    arg_parse.add_argument('-a', '--aspect', default=1.7776, help='The aspect ratio for the sample images')
    arg_parse.add_argument('-d', '--yaw_difference', default=50, help='The minimum yaw angle differences for one job')
    arg_parse.add_argument('-s', '--sanity_check_rate', default=5, help='Number of real samples per sanity check')
    args = arg_parse.parse_args()
    for child in Path('./sample_data').iterdir():
        if args.clear and child.is_file() and child.suffix != '.json':
            os.remove(child)
            with open('./sample_data/jobs.json', 'w') as f:
                f.write('[]')
    create_jobs(Path(args.dataset_path), args.fov, args.aspect, args.yaw_difference, args.sanity_check_rate)

if __name__ == "__main__":
    main()