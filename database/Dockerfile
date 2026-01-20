FROM postgres:15-alpine

# On copie le script d'initialisation directement dans l'image
# Cela évite tous les problèmes de montage de volume, de permissions SELinux, etc.
COPY init.sql /docker-entrypoint-initdb.d/init.sql