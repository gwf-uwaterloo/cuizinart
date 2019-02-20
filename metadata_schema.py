import os
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from dotenv import load_dotenv
from marshmallow import fields
from flask_marshmallow import Marshmallow

load_dotenv()
app = Flask('cuizinart')
DB_URL = 'postgresql://{user}:{pw}@{url}/{db}'.format(user=os.getenv('POSTGRES_USER'), pw=os.getenv('POSTGRES_PW'),
                                                      url=os.getenv('POSTGRES_URL'), db=os.getenv('POSTGRES_DB'))
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_DATABASE_URI'] = DB_URL

db = SQLAlchemy(app)
migrate = Migrate(app, db)
ma = Marshmallow(app)


class Product(db.Model):
    product_id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String, unique=True, nullable=False)
    name = db.Column(db.String, nullable=False)
    temporal_resolution = db.Column(db.Interval, nullable=False)
    doi = db.Column(db.String)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)

    domain = db.relationship("Domain", uselist=False, backref="product", lazy=True)
    variables = db.relationship('Variable', backref='product', lazy=True)
    horizons = db.relationship('Horizon', backref='product', lazy=True)
    issues = db.relationship('Issue', backref='product', lazy=True)

    def __repr__(self):
        return '<Product {!r}>'.format(self.key)


class Variable(db.Model):
    variable_id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String, nullable=False)
    name = db.Column(db.String, nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.product_id'), nullable=False)
    is_live = db.Column(db.Boolean, nullable=False)
    ec_varname = db.Column(db.String)
    type = db.Column(db.String)
    level = db.Column(db.String)
    unit = db.Column(db.String)

    db.UniqueConstraint('key', 'product_id', name='variable_uc')

    def __repr__(self):
        return '<Variable {!r} (product: {!r})>'.format(self.key, self.product_id)


class Domain(db.Model):
    domain_id = db.Column(db.Integer, primary_key=True)
    extent = db.Column(db.JSON, nullable=False)
    bounding_box = db.Column(db.JSON, nullable=False)
    grid_mapping = db.Column(db.JSON, nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.product_id'), nullable=False)

    def __repr__(self):
        return '<Domain {!r}>'.format(self.domain_id)


class Horizon(db.Model):
    horizon_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.product_id'), nullable=False)
    horizon = db.Column(db.Integer, nullable=False)

    def __repr__(self):
        return '<Horizon {!r}>'.format(self.horizon_id)


class Issue(db.Model):
    issue_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.product_id'), nullable=False)
    issue = db.Column(db.Time, nullable=False)

    def __repr__(self):
        return '<Issue {!r}>'.format(self.issue_id)


class ProductSchema(ma.ModelSchema):
    variables = fields.Nested('VariableSchema', default=None, many=True)
    domain = fields.Nested('DomainSchema', default=None)

    class Meta:
        model = Product


class VariableSchema(ma.ModelSchema):
    class Meta:
        model = Variable


class DomainSchema(ma.ModelSchema):
    class Meta:
        model = Domain


class HorizonSchema(ma.ModelSchema):
    class Meta:
        model = Horizon


class IssueSchema(ma.ModelSchema):
    class Meta:
        model = Issue

