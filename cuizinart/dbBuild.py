from metadata_schema import ProductSchema, Product, Domain,Horizon,Issue, Request,Variable, db
import csv

with open ("Tbl_prod_backup.csv") as csvfile:
    reader=csv.reader(csvfile)
    for row in reader:
        print(row)