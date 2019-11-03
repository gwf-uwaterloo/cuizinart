FROM python:3.6
RUN useradd -ms /bin/bash gwf

COPY --chown=gwf . /home/gwf/code
WORKDIR /home/gwf/code

RUN apt-get update && \
    apt-get install -y default-jre

RUN pip install -r requirements.txt

ENV SPARK_HOME=/usr/local/lib/python3.6/site-packages/pyspark/
RUN geopyspark install-jar

USER gwf
CMD ["python3", "pyspark_app.py"]
