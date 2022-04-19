import os
import io
import cv2
from uuid import uuid1
from flask import Flask, jsonify, request, session, send_file
from .manager import BatchManager

def create_app(test_config=None):
    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        BATCH_SIZE=50,
        N_ANNOTATORS_PER_JOB=3,
        RESET_DATABASE=True,
        JOBS_FILE='./sample_data/jobs.json',
        N_SANITY_CHECKS=1,
        PONY = {
            'provider': 'sqlite',
            'filename': os.path.join(app.instance_path, 'db.db3'),
            'create_db': True
        }
    )

    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_pyfile('config.py', silent=True)
    else:
        # load the test config if passed in
        app.config.from_mapping(test_config)

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    manager = BatchManager( 
        db_config=app.config['PONY'], 
        jobs_file=app.config['JOBS_FILE'],
        batch_size=app.config['BATCH_SIZE'],
        reset=app.config['RESET_DATABASE'],
        n_sanity_checks=app.config['N_SANITY_CHECKS'],
        n_annotators_per_job=app.config['N_ANNOTATORS_PER_JOB']
    )

    @app.route("/api/reset")
    def reset():
        n = manager.remove_timed_out_jobs()
        return jsonify(removed=n>0, n=n)

    @app.route("/api/progress")
    def progress():
        return jsonify(manager.progress())

    @app.route("/api/failed")
    def failed():
        return jsonify(manager.failed())

    @app.route("/api/clean")
    def clean():
        return jsonify(manager.clean())
        

    @app.route("/api/submit/<user_id>/<name>", methods=['POST'])
    def submit_data(user_id, name):
        if request.method == 'POST':
            data = request.get_json() # a multidict containing POST data
            success = manager.submit(user_id, str(name), data)
        return jsonify(success=success)

    @app.route("/api/user_id")
    def user_id():
        if not 'user_id' in session:
            uuid = uuid1().hex
            session['user_id'] = uuid
            session[uuid] = False
        batch = manager.get_next(session['user_id'])
        isDone = len(batch) == 0
        return jsonify({"user_id": session['user_id'], "started": session[session['user_id']], "batch": batch, "isDone": isDone})

    @app.route("/api/user/<user_id>")
    def start(user_id):
        session[user_id] = True
        return jsonify(success=True)

    @app.route("/api/user/finished/<uuid>")
    def get_mturk_id(uuid):
        mturkId = manager.user_finished(uuid)
        return jsonify({"uuid": uuid, "mturkId": mturkId})

    @app.route("/api/image/<name>")
    def image(name):
        image = cv2.imread(manager.image(name), cv2.IMREAD_COLOR)
        _, buffer_img = cv2.imencode('.jpg', image)
        return send_file(io.BytesIO(buffer_img),  mimetype='image/jpeg',  as_attachment=True, attachment_filename='image.jpg')

    return app