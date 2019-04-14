FROM python:3.6
ADD . /cuizinart

RUN curl -sL https://deb.nodesource.com/setup_11.x | bash -
RUN apt-get install -y nodejs

WORKDIR /cuizinart/frontend
RUN npm install && npm run build

WORKDIR /

# We need to run the flask commands from the project base folders,
# so we execute the app from there
RUN mv /cuizinart/docker-entrypoint.sh /

RUN chmod +x docker-entrypoint.sh

RUN apt-get update && apt-get -y install libgdal-dev
RUN wget http://download.osgeo.org/gdal/2.1.2/gdal212.zip; unzip gdal212.zip; rm gdal212.zip
RUN cd gdal-2.1.2; ./configure --with-python; make -j 32; make install -j 32; cd ..

RUN pip install -r /cuizinart/requirements.txt

CMD ["/bin/bash", "docker-entrypoint.sh", "/tuna1/scratch/mgauch/data/cuizinart"]
