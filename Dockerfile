FROM ubuntu:xenial

WORKDIR /usr/src/app

RUN apt-get update --fix-missing
RUN apt-get install -y software-properties-common build-essential
RUN apt-get install -y postgresql-9.5 postgresql-client-9.5 postgresql-contrib-9.5 postgresql-server-dev-9.5
# RUN psql -h localhost -c "alter user postgres with password 'postgres'"
RUN apt-get install -y redis-server

RUN add-apt-repository ppa:deadsnakes/ppa
RUN apt-get update
RUN apt-get install -y python3.6 python3.6-venv python3.6-dev
RUN apt-get install curl
RUN curl https://bootstrap.pypa.io/get-pip.py | python3.6

COPY ./autograder-server /usr/src/app/
RUN python3.6 -m pip install --no-cache-dir -r requirements.txt
