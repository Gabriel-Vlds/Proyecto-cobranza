import datetime
import os
import subprocess

def obtener_uso_disco():
    resultado = subprocess.run(['df', '-h', '/'], capture_output=True, text=True)
    lineas = resultado.stdout.strip().split('\n')
    if len(lineas) > 1:
        datos = lineas[1].split()
        return f"Total: {datos[1]} | Usado: {datos[2]} | Libre: {datos[3]} | {datos[4]} ocupado"
    return "No disponible"

def obtener_memoria():
    try:
        with open('/proc/meminfo') as f:
            lineas = f.readlines()
        mem = {}
        for linea in lineas:
            partes = linea.split()
            mem[partes[0].rstrip(':')] = int(partes[1])
        total = mem['MemTotal'] // 1024
        disponible = mem['MemAvailable'] // 1024
        usado = total - disponible
        porcentaje = round((usado / total) * 100, 1)
        return f"Total: {total}MB | Usado: {usado}MB | Libre: {disponible}MB | {porcentaje}% ocupado"
    except:
        return "No disponible"

def obtener_contenedores_docker():
    try:
        resultado = subprocess.run(
            ['docker', 'ps', '--format', '{{.Names}} | {{.Status}} | {{.Ports}}'],
            capture_output=True, text=True
        )
        if resultado.stdout.strip():
            return resultado.stdout.strip().split('\n')
        return ["Sin contenedores activos"]
    except:
        return ["Docker no disponible"]

def crear_informe():
    fecha = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    nombre_archivo = "reporte_salud.txt"
    carga = os.getloadavg() if hasattr(os, 'getloadavg') else "No disponible"

    with open(nombre_archivo, "w") as f:
        f.write(f"REPORTE DE SALUD DEL SERVIDOR\n")
        f.write(f"Empresa: Soluciones Tecnologicas del Futuro\n")
        f.write(f"Generado: {fecha}\n")
        f.write(f"{'='*50}\n\n")

        f.write(f"CPU\n")
        f.write(f"  Carga promedio (1m, 5m, 15m): {carga}\n\n")

        f.write(f"MEMORIA RAM\n")
        f.write(f"  {obtener_memoria()}\n\n")

        f.write(f"DISCO\n")
        f.write(f"  {obtener_uso_disco()}\n\n")

        f.write(f"CONTENEDORES DOCKER\n")
        for contenedor in obtener_contenedores_docker():
            f.write(f"  - {contenedor}\n")

        f.write(f"\n{'='*50}\n")
        f.write(f"Estado general: OPERACIONAL\n")

    print(f"Reporte generado exitosamente: {nombre_archivo}")
    print(f"Memoria: {obtener_memoria()}")
    print(f"Disco:   {obtener_uso_disco()}")

if __name__ == "__main__":
    crear_informe()
