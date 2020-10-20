#!/bin/bash

CURRENTDATE=`date`
printf "\n\n${CURRENTDATE}\n\n"

echo "sending dummy request:"
python3 send_dummy_request.py $1  # $1 contains the password for the dummy user.

echo "all requests:"
docker exec -t cuizinart_postgres_1 sh -c "psql -U postgres cuizinart -c 'select count(*) as count, count(user_id) as user_count, sum(processing_time_s) as sum_processing_time_s,sum(file_size_mb) as sum_file_size_mb, sum(n_files) as sum_n_files from request where received_time >= CURRENT_DATE - 1;'"

echo "scheduled requests:"
docker exec -t cuizinart_postgres_1 sh -c "psql -U postgres cuizinart -c 'select count(*) as count, count(user_id) as user_count from request where received_time >= CURRENT_DATE - 1 and request_status = '\''SCHEDULED'\'';'"

echo "invalid requests:"
docker exec -t cuizinart_postgres_1 sh -c "psql -U postgres cuizinart -c 'select request_name, product_id, received_time, request_valid, request_status, status_reason, processed_stat, processed_time, processing_time_s, email_sent_time, file_location, n_files, file_size_mb from request where received_time >= CURRENT_DATE - 1 and NOT request_valid;'"

echo "------------------------------------------------------"

