FROM python:3.6

RUN useradd -ms /bin/bash gwf
COPY --chown=gwf . /home/gwf/cuizinart

RUN mkdir /home/gwf/.ssh && mv /home/gwf/cuizinart/.id_rsa /home/gwf/.ssh/id_rsa && chown -R gwf:gwf /home/gwf/.ssh && chmod 700 /home/gwf/.ssh
RUN curl -sL https://deb.nodesource.com/setup_11.x | bash -
RUN apt-get install -y nodejs
RUN apt-get install -y vim curl
RUN apt-get update && apt-get -y install libgdal-dev
RUN wget http://download.osgeo.org/gdal/2.1.2/gdal212.zip; unzip gdal212.zip; rm gdal212.zip
RUN cd gdal-2.1.2; ./configure --with-python; make -j 32; make install -j 32; cd ..

RUN pip install -r /home/gwf/cuizinart/requirements.txt

USER gwf
WORKDIR /home/gwf/cuizinart/frontend
RUN npm install && npm run build
WORKDIR /home/gwf/

# We need to run the flask commands from the project base folders,
# so we execute the app from there
RUN mv /home/gwf/cuizinart/docker-entrypoint.sh /home/gwf/
RUN chmod +x /home/gwf/docker-entrypoint.sh

HEALTHCHECK --interval=5m --timeout=10s --retries=3 \
 CMD curl -f http://localhost:5000/ || exit 1
CMD ["/bin/bash", "/home/gwf/docker-entrypoint.sh"]
