import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///taskboard.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-dev-secret')
    
    CORS(app, supports_credentials=True)
    db.init_app(app)
    
    from app.api import auth, boards, stages, tasks, lists, sharing
    
    app.register_blueprint(auth.bp, url_prefix='/api/v1/auth')
    app.register_blueprint(boards.bp, url_prefix='/api/v1/boards')
    app.register_blueprint(stages.bp, url_prefix='/api/v1/boards')
    app.register_blueprint(tasks.bp, url_prefix='/api/v1/boards')
    app.register_blueprint(lists.bp, url_prefix='/api/v1/lists')
    app.register_blueprint(sharing.bp, url_prefix='/api/v1/boards')
    
    with app.app_context():
        db.create_all()
    
    return app
