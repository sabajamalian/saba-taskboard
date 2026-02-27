import os
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()


def create_app():
    # Serve frontend from ../frontend directory
    frontend_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'frontend')
    app = Flask(__name__, static_folder=frontend_folder, static_url_path='')
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///taskboard.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-dev-secret')
    
    CORS(app, supports_credentials=True)
    db.init_app(app)
    
    from app.api import auth, projects, boards, stages, tasks, lists, templates
    
    app.register_blueprint(auth.bp, url_prefix='/api/v1/auth')
    app.register_blueprint(projects.bp, url_prefix='/api/v1/projects')
    app.register_blueprint(boards.bp, url_prefix='/api/v1/projects/<int:project_id>/boards')
    app.register_blueprint(stages.bp, url_prefix='/api/v1/projects/<int:project_id>/boards')
    app.register_blueprint(tasks.bp, url_prefix='/api/v1/projects/<int:project_id>/boards')
    app.register_blueprint(lists.bp, url_prefix='/api/v1/projects/<int:project_id>/lists')
    app.register_blueprint(templates.bp, url_prefix='/api/v1/templates')
    
    # Serve frontend
    @app.route('/')
    def serve_frontend():
        return send_from_directory(app.static_folder, 'index.html')
    
    with app.app_context():
        db.create_all()
    
    return app
