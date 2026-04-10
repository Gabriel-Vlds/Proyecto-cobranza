import datetime
import os

def crear_informe():
    fecha = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    nombre_archivo = "reporte_salud.txt"
    
    carga = os.getloadavg() if hasattr(os, 'getloadavg') else "No disponible"

    with open(nombre_archivo, "w") as f:
        f.write("==========================================\n")
        f.write(f"REPORTE DE SALUD DEL SERVIDOR - {fecha}\n")
        f.write("==========================================\n")
        f.write(f"Estado del CPU (Carga): {carga}\n")
        f.write("Empresa: Soluciones Tecnológicas del Futuro\n")
        f.write("Estado: Operacional\n")
    
    print(f"Reporte generado exitosamente en: {nombre_archivo}")

if __name__ == "__main__":
    crear_informe()
