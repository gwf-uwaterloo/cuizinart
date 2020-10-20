#!/bin/bash

docker exec -it cuizinart_postgres_1 sh -c "psql -U postgres cuizinart -c 'copy \"user\"(first_name,last_name,email) to '\''/tmp/emails.csv'\'' delimiter '\'','\'' csv header;'";
docker cp cuizinart_postgres_1:/tmp/emails.csv .

