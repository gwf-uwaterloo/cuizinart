import csv
from settings import app
from metadata_schema import ProductSchema, Product, Domain,Horizon,Issue, Request,Variable,User, db
from datetime import datetime, timedelta, time, timezone


m={}
@app.cli.command()
def db_build():
    with open ("DB_Backup/Tbl_prod_backup.csv") as csvfile:
        reader=csv.DictReader(csvfile)
        for row in reader:
            prod=Product(product_id= int(row['prodkey']),key=row['prod'],name=row['product_name'],start_date=datetime.strptime(row['startdate'],'%Y-%m-%d %H:%M'),end_date=datetime.strptime(row['enddate'],'%Y-%m-%d %H:%M'))
            prod.horizons=[]
            prod.issues=[]
            prod.variables=[]
            m[row['product_id']]=prod
            db.session.add(prod)
    

    with open("DB_Backup/Tbl_horizon_backup.csv") as csvfile:
        reader=csv.DictReader(csvfile)
        for row in reader:
            horizon=Horizon(horizon_id= int(row['horizonkey']),horizon= int(row["avail_horizon"]))
            m[row['product_id']].horizons.append(horizon)
            db.session.add(horizon)
    with open("DB_Backup/Tbl_issues_backup.csv") as csvfile:
        reader=csv.DictReader(csvfile)
        for row in reader:
            issue=Issue(issue_id=int(row['issuekey']),issue=int(row["avail_issues"]))
            m[row['product_id']].issues.append(issue)
            db.session.add(issue)
    with open("DB_Backup/Tbl_user_backup.csv") as csvfile:
        reader=csv.DictReader(csvfile)
        for row in reader:
            user= User(id=int(row["userkey"]),email=row['email'],first_name=row['firstname'],last_name=row['lastname'],organization=row['employer'],globus_id=row['globus_id'])
            db.session.add(user)
    with open("DB_Backup/Tbl_vbl_backup.csv") as csvfile:
        reader=csv.DictReader(csvfile)
        for row in reader:
            var=Variable(variable_id=int(row["vblkey"]),key=row["vbl"],name=["vbl_name"],unit=row["units"],ec_varname=row["ec_vname"],level=["level"],is_live=row['islive'],type=row['type'])
            m[row['product_id']].variables.append(var)
            db.session.add(var)
    # with open("DB_Backup/Tbl_request_backup") as csvfile:
    #     reader=csv.DictReader(csvfile)
    #     for row in reader:
    #         req=Request(request_id=row['requestkey'],request_name=row["request_id"],)
    db.session.commit()
