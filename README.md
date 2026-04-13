# CobranzaPro – Plataforma de Pagos Recurrentes

> Proyecto DevOps en AWS | Fundamentos DevOps | TECMI | Al07022605

---

## Descripción

**CobranzaPro** es una plataforma web de gestión de cobros recurrentes desarrollada para *Soluciones Tecnológicas del Futuro*. Este repositorio contiene tanto la aplicación web como toda la infraestructura DevOps implementada en Amazon Web Services (AWS), siguiendo las mejores prácticas de la industria.

---

## Stack Tecnológico

| Categoría | Herramienta |
|---|---|
| Aplicación | HTML5 / CSS3 / JavaScript |
| Servidor web | nginx:alpine (Docker) |
| Contenedores | Docker + Docker Compose |
| Infraestructura | AWS CloudFormation (IaC) |
| Cómputo | AWS EC2 (t2.small) |
| Almacenamiento | AWS S3 |
| Automatización | Bash + Python 3 (Boto3) |
| Control de versiones | Git / GitHub |
| CI/CD | AWS CodePipeline + CodeBuild |
| Monitoreo | AWS CloudWatch |

---

## Estructura del Repositorio

```
Proyecto-cobranza/
├── index.html              # Aplicación web principal
├── styles.css              # Estilos de la aplicación
├── app.js                  # Lógica del frontend
├── Dockerfile              # Multi-stage build con nginx
├── nginx.conf              # Configuración del servidor web
├── docker-compose.yml      # Orquestación: web + monitor
├── infraestructura.yaml    # Plantilla CloudFormation
├── limpieza.sh             # Script Bash de mantenimiento
├── generar_reporte.py      # Reporte de salud del servidor
├── gestion_aws.py          # Gestión de recursos AWS con Boto3
└── README.md
```

---

## Configuración de Ramas

| Rama | Propósito |
|---|---|
| `main` | Producción. Protegida: requiere pull request y 1 aprobación |
| `develop` | Integración de features antes de pasar a producción |

---

## Despliegue con Docker

### Construir la imagen

```bash
docker build -t cobranzapro .
```

### Levantar todos los servicios

```bash
docker compose up -d
```

### Verificar estado

```bash
docker compose ps
```

### Servicios disponibles

| Servicio | URL |
|---|---|
| App web | http://localhost |
| Monitor de métricas | http://localhost:9113/metrics |

---

## Scripts de Automatización

### limpieza.sh
Limpieza de archivos temporales, logs y caché. Programado con cron cada domingo a las 2 AM.

```bash
bash limpieza.sh
```

### generar_reporte.py
Genera reporte de salud: CPU, RAM, disco y contenedores activos.

```bash
python3 generar_reporte.py
```

### gestion_aws.py
Lista buckets S3, instancias EC2 y puede aprovisionar nuevas instancias.

```bash
python3 gestion_aws.py
```

---

## Infraestructura como Código (CloudFormation)

La plantilla `infraestructura.yaml` despliega:
- Security Group con reglas HTTP/HTTPS/SSH
- Instancia EC2 (t2.micro) con Amazon Linux
- Bucket S3 para almacenamiento (con versionado)
- Bucket S3 para logs (lifecycle: 30 días)

### Desplegar

```bash
aws cloudformation deploy \
  --template-file infraestructura.yaml \
  --stack-name cobranzapro-stack \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Ver outputs

```bash
aws cloudformation describe-stacks \
  --stack-name cobranzapro-stack \
  --query 'Stacks[0].Outputs' \
  --output table
```

---

## Convenciones de Commits

```
feat:  Nueva funcionalidad
fix:   Corrección de errores
docs:  Cambios en documentación
chore: Tareas de mantenimiento
```

---

## Autor

**Gabriel Valdés** | Matrícula: Al07022605  
Materia: Fundamentos DevOps | TECMI | 2026

