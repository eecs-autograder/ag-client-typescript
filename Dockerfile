FROM python:3.6

WORKDIR /usr/src/app

COPY ./autograder-server /usr/src/app/
RUN python3.6 -m pip install --no-cache-dir -r requirements.txt
