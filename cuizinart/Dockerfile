FROM python:3.6
ADD . /code
WORKDIR /code

RUN chmod +x /code/docker-entrypoint.sh
RUN pip install -r requirements.txt

COPY init.sql /docker-entrypoint-initdb.d/10-init.sql

CMD ["/bin/bash", "/code/docker-entrypoint.sh"]
