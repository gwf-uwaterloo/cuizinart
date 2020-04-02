import csv
from settings import app
from metadata_schema import ProductSchema, Product, Domain,Horizon,Issue, Request,Variable,User, db
from datetime import datetime, timedelta, time, timezone
import json
import sys
import re

csv.field_size_limit(sys.maxsize)

m={}
usermap={}
pmap={}
emails=set()
user_email={}
@app.cli.command()
def db_build():
    with open ("DB_Backup/Tbl_prod_backup.csv") as csvfile:
        reader=csv.DictReader(csvfile)
        for row in reader:
            prod=Product(product_id= int(row['prodkey']),key=row['prod'],name=row['product_name'],start_date=datetime.strptime(row['startdate'],'%Y-%m-%d %H:%M:%S'),end_date=datetime.strptime(row['enddate'],'%Y-%m-%d %H:%M:%S'))
            prod.horizons=[]
            prod.issues=[]
            prod.variables=[]
            prod.requests=[]
            prod.domain=Domain(extent=json.loads('{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-83.3203125,43.068887774169625],[-73.47656249999999,43.068887774169625],[-73.47656249999999,48.922499263758255],[-83.3203125,48.922499263758255],[-83.3203125,43.068887774169625]]]}}]}'))
            m[row['product_id']]=prod
            pmap[row['prod']]=prod
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
            issue=Issue(issue_id=int(row['issuekey']),issue=time(hour = int(row["avail_issues"])))
            m[row['product_id']].issues.append(issue)
            db.session.add(issue)
    with open("DB_Backup/Tbl_user_backup.csv") as csvfile:
        reader=csv.DictReader(csvfile)
        for row in reader:
            if(not (row['email'] in emails)):
                user= User(id=int(row["userkey"]),email=row['email'],first_name=row['firstname'],last_name=row['lastname'],organization=row['employer'],globus_id=row['globus_id'])
                user.requests=[]
                emails.add(row['email'])
                db.session.add(user)
                usermap[row['email']]=user
            user_email[row['uid']]=row['email']   
    with open("DB_Backup/Tbl_vbl_backup.csv") as csvfile:
        reader=csv.DictReader(csvfile)
        for row in reader:
            var=Variable(variable_id=int(row["vblkey"]),key=row["vbl"],name=["vbl_name"],unit=row["units"],ec_varname=row["ec_vname"],level=["level"],is_live=(row['islive']=='t'),type=row['type'])
            m[row['product_id']].variables.append(var)
            db.session.add(var)
    with open("DB_Backup/Tbl_request_backup.csv") as csvfile:
        reader=csv.DictReader(csvfile)
        for row in reader:
            reqid=int(re.findall(r'\d+', row['request_id'])[0])
            if(reqid>137):
                req=Request(request_id=row['requestkey'],request_name=row["request_id"],request_valid=(row['valid']=='t'),file_location=row['file_location'],request_status=row['request_status'])
                if(row['processing_time_s']!=""):
                    req.processing_time_s=int(row["processing_time_s"])
                if(row['file_size_mb']!=""):
                    req.file_size_mb=int(row['file_size_mb'])
                if(row["processed_stat"]!=""):
                    req.processed_stat=int(row["processed_stat"])
                if(row['sent'] != ""):
                    if(len(row['sent'])<20):
                        req.received_time=datetime.strptime(row['sent'],'%Y-%m-%d %H:%M:%S')
                    else:
                        req.received_time=datetime.strptime(row['sent'],'%Y-%m-%d %H:%M:%S.%f')
                if(row["processed"]!=""):
                    req.processed_time=datetime.strptime(row["processed"],'%Y-%m-%d %H:%M:%S.%f')
                if(row['email_sent']!=""):
                    req.email_sent_time=datetime.strptime(row['email_sent'],'%Y-%m-%d %H:%M:%S.%f')
                if(row['req_str']!=""):
                    req.request_json=json.loads(row['req_str'])
                if(user_email[row['uid']] in usermap and row['prod'] in pmap):
                    usermap[user_email[row['uid']]].requests.append(req)
                    pmap[row['prod']].requests.append(req)
                    db.session.add(req)
    db.session.commit()
