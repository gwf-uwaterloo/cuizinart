import click
from flask_security.utils import hash_password
from flask_sqlalchemy import SQLAlchemy
from marshmallow import fields
from flask_marshmallow import Marshmallow
from settings import app
from flask_migrate import Migrate
from flask_security import Security, SQLAlchemyUserDatastore, UserMixin, RoleMixin

db = SQLAlchemy(app)
migrate = Migrate(app, db)
ma = Marshmallow(app)


class Product(db.Model):
    product_id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String, unique=True, nullable=False)
    name = db.Column(db.String, nullable=False)
    temporal_resolution = db.Column(db.Interval)
    doi = db.Column(db.String)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)

    domain = db.relationship("Domain", uselist=False, backref="product", lazy=True)
    variables = db.relationship('Variable', backref='product', lazy=True)
    horizons = db.relationship('Horizon', backref='product', lazy=True)
    issues = db.relationship('Issue', backref='product', lazy=True)
    ncFiles = db.relationship('NCFile', backref='product', lazy=True)
    requests = db.relationship('Request', backref='product', lazy=True)

    def __repr__(self):
        return '<Product {!r}>'.format(self.key)


class Variable(db.Model):
    __table_args__ = (
        db.UniqueConstraint('key', 'product_id', name='variable_uc'),
    )
    variable_id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String, nullable=False)
    name = db.Column(db.String, nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.product_id'), nullable=False)
    is_live = db.Column(db.Boolean, nullable=False)
    ec_varname = db.Column(db.String)
    type = db.Column(db.String)
    level = db.Column(db.String)
    unit = db.Column(db.String)

    def __repr__(self):
        return '<Variable {!r} (product: {!r})>'.format(self.key, self.product_id)


class Domain(db.Model):
    domain_id = db.Column(db.Integer, primary_key=True)
    extent = db.Column(db.JSON, nullable=False)
    bounding_box = db.Column(db.JSON)
    grid_mapping = db.Column(db.JSON)
    product_id = db.Column(db.Integer, db.ForeignKey('product.product_id'), nullable=False)

    def __repr__(self):
        return '<Domain {!r}>'.format(self.domain_id)


class Horizon(db.Model):
    __table_args__ = (
        db.UniqueConstraint('horizon', 'product_id', name='horizon_uc'),
    )
    horizon_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.product_id'), nullable=False)
    horizon = db.Column(db.Integer, nullable=False)


    def __repr__(self):
        return '<Horizon {!r}>'.format(self.horizon_id)


class Issue(db.Model):
    __table_args__ = (
        db.UniqueConstraint('issue', 'product_id', name='issue_uc'),
    )
    issue_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.product_id'), nullable=False)
    issue = db.Column(db.Time, nullable=False)

    def __repr__(self):
        return '<Issue {!r}>'.format(self.issue_id)


class NCFile(db.Model):
    __table_args__ = (
        db.UniqueConstraint('file_name', 'product_id', name='nc_file_uc'),
    )
    file_id = db.Column(db.Integer, primary_key=True)
    file_name = db.Column(db.String, nullable=False)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    product_id = db.Column(db.Integer, db.ForeignKey('product.product_id'), nullable=False)

    def __repr__(self):
        return '<NCFile {!r}>'.format(self.file_id)


class Request(db.Model):
    request_id = db.Column(db.Integer, primary_key=True)
    request_name = db.Column(db.String, nullable=False, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.product_id'), nullable=False)
    request_json = db.Column(db.JSON, nullable=False)
    request_status = db.Column(db.String)
    processing_time_s = db.Column(db.Integer)
    file_location = db.Column(db.String)
    n_files = db.Column(db.Integer)
    file_size_mb = db.Column(db.Integer)
    backend = db.Column(db.String)

    def __repr__(self):
        return '<Request {!r}>'.format(self.request_id)


roles_users = db.Table('roles_users',
                       db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
                       db.Column('role_id', db.Integer(), db.ForeignKey('role.id')))


class Role(db.Model, RoleMixin):
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))

    def __repr__(self):
        return '<Role {!r}>'.format(self.id)


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True)
    password = db.Column(db.String(255))
    globus_id = db.Column(db.String(255))
    active = db.Column(db.Boolean())
    confirmed_at = db.Column(db.DateTime())
    agreed_disclaimer_at = db.Column(db.DateTime())

    roles = db.relationship('Role', secondary=roles_users, backref=db.backref('users', lazy='dynamic'))
    requests = db.relationship('Request', backref='user', lazy=True)

    def __repr__(self):
        return '<User {!r}>'.format(self.id)


user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security(app, user_datastore)


@app.cli.command()
@click.argument('password')
def pyspark_init(password):
    db.create_all()
    pyspark_role = Role.query.filter_by(name='pyspark').first()
    if pyspark_role is None:
        click.echo('Creating role "pyspark"')
        pyspark_role = user_datastore.create_role(name='pyspark')
    if User.query.filter(User.roles.any(Role.name=='pyspark')).first() is None:
        click.echo('Creating user "pyspark"')
        user_datastore.create_user(email='pyspark', password=hash_password(password), active=True,
                                   confirmed_at='2019-01-01 00:00:00', roles=[pyspark_role])
    db.session.commit()


class ProductSchema(ma.ModelSchema):
    variables = fields.Nested('VariableSchema', default=None, many=True)
    domain = fields.Nested('DomainSchema', default=None)
    horizons = fields.Nested('HorizonSchema', default=None, many=True)
    issues = fields.Nested('IssueSchema', default=None, many=True)

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
