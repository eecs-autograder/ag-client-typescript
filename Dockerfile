FROM python:3.8

WORKDIR /usr/src/app

COPY ./autograder-server/requirements.txt /usr/src/app/
RUN python3.8 -m pip install --no-cache-dir -r requirements.txt
