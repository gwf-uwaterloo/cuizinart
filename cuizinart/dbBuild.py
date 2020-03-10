import csv
from settings import app
from metadata_schema import ProductSchema, Product, Domain,Horizon,Issue, Request,Variable, db


m={}
@app.cli.command()
def db_build():
    with open ("DB_Backup/Tbl_prod_backup.csv") as csvfile:
        reader=csv.reader(csvfile)
        for row in reader:
            prod=Product(product_id=row['prodkey'],key=row['prod'],name=row['product_name'],start_date=row['startdate'],end_date=row['enddate'])
            m[row['product_id']]=row['prod']
            db.session.add(prod)
    db.session.commit()
#     with open("Tbl_horizon_backup.csv") as csvfile:
#         reader=csv.reader(csvfile)
#         for row in reader:
#             horizon=Horizon(horizon_id=row['horizonkey'],horizon=row["avail_horizon"])

#     with open("Tbl_issues_backup.csv") as csvfile:
#         reader=csv.reader(csvfile)
#         for row in reader:
#             issue=Issue(issue_id=row['issuekey'],issue=row["avail_issues"])

#     with open("Tbl_grid_user.csv") as csvfile:
#         reader=csv.reader(csvfile)
#         for row in reader:
#             user= User(id=row["userkey"],email=row['email'],first_name=row['firstname'],last_name=row['lastname'],organization=row['employer'],globus_id=row['globus_id'])

    # with open("Tbl_vbl_backup") as csvfile:
    #     reader=csv.reader(csvfile)
    #     for row in reader:
