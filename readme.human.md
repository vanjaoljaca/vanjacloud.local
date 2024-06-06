# vanjacloud.local

Usage is with yarn. bun does not have link yet

This is the local service that does random odd jobs on my local machine.

--prod to run in prod mode

yarn install to install w pm2

# Add an sslcert

mkdir sslcert
cd sslcert
openssl req -nodes -new -x509 -keyout server.key -out server.cert
