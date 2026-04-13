#!/bin/bash

# Script de mantenimiento automatizado
# Empresa: Soluciones Tecnológicas del Futuro
# Autor: Gabriel Valdes

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sin color

# Archivo de log del script
LOG_FILE="/var/log/mantenimiento.log"
FECHA=$(date '+%Y-%m-%d %H:%M:%S')

# Función para registrar mensajes
log() {
    echo -e "${GREEN}[OK]${NC} $1"
    echo "[$FECHA] $1" >> $LOG_FILE 2>/dev/null || true
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$FECHA] ERROR: $1" >> $LOG_FILE 2>/dev/null || true
}

advertencia() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

echo ""
echo "================================================"
echo "  Mantenimiento Automatizado - CobranzaPro"
echo "  Fecha: $FECHA"
echo "================================================"
echo ""

# 1. Limpiar archivos temporales
advertencia "Limpiando archivos temporales en /tmp..."
sudo rm -rf /tmp/* 2>/dev/null && log "Archivos temporales eliminados" || error "No se pudo limpiar /tmp"

# 2. Limpiar logs antiguos (más de 7 días)
advertencia "Eliminando logs con más de 7 días..."
sudo find /var/log -type f -name "*.log" -mtime +7 -exec truncate -s 0 {} + 2>/dev/null
log "Logs antiguos limpiados"

# 3. Limpiar caché de paquetes
advertencia "Limpiando caché de apt..."
sudo apt-get clean -y 2>/dev/null && log "Caché de apt limpiada" || error "No se pudo limpiar caché de apt"

# 4. Limpiar imágenes Docker sin usar
advertencia "Limpiando imágenes Docker sin usar..."
docker image prune -f 2>/dev/null && log "Imágenes Docker limpiadas" || advertencia "Docker no disponible o sin imágenes que limpiar"

# 5. Mostrar espacio en disco después de limpieza
echo ""
advertencia "Espacio en disco actual:"
df -h / | awk 'NR==2 {print "  Usado: "$3" / Total: "$2" ("$5" ocupado)"}'

echo ""
log "Mantenimiento completado el: $FECHA"
echo ""
