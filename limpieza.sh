#!/bin/bash

# --- Script de Mantenimiento Automatizado ---
# Empresa: Soluciones Tecnológicas del Futuro

echo "Iniciando limpieza de logs y archivos temporales..."

sudo rm -rf /tmp/*

sudo find /var/log -type f -name "*.log" -exec truncate -s 0 {} +

sudo apt-get clean

echo "Mantenimiento completado el: $(date)"
