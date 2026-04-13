import boto3
from botocore.exceptions import NoCredentialsError, ClientError
import datetime

def listar_s3():
    s3 = boto3.client('s3')
    print("\n[+] Buckets S3:")
    buckets = s3.list_buckets()
    for bucket in buckets['Buckets']:
        nombre = bucket['Name']
        print(f"  Bucket: {nombre}")
        try:
            objetos = s3.list_objects_v2(Bucket=nombre, MaxKeys=5)
            if 'Contents' in objetos:
                for obj in objetos['Contents']:
                    tam = round(obj['Size'] / 1024, 2)
                    print(f"    - {obj['Key']} ({tam} KB)")
            else:
                print(f"    (bucket vacio)")
        except ClientError:
            print(f"    (sin acceso al contenido)")

def listar_ec2():
    ec2 = boto3.client('ec2')
    print("\n[+] Instancias EC2:")
    respuesta = ec2.describe_instances()
    for reserva in respuesta['Reservations']:
        for inst in reserva['Instances']:
            nombre = "Sin nombre"
            for tag in inst.get('Tags', []):
                if tag['Key'] == 'Name':
                    nombre = tag['Value']
            print(f"  - {nombre} | ID: {inst['InstanceId']} | Tipo: {inst['InstanceType']} | Estado: {inst['State']['Name']}")

def aprovisionar_ec2(nombre_instancia):
    ec2 = boto3.client('ec2')
    print(f"\n[+] Aprovisionando instancia: {nombre_instancia}")
    try:
        # Obtener AMI de Amazon Linux 2023
        ami = ec2.describe_images(
            Filters=[
                {'Name': 'name', 'Values': ['al2023-ami-*-x86_64']},
                {'Name': 'owner-alias', 'Values': ['amazon']},
                {'Name': 'state', 'Values': ['available']}
            ]
        )
        ami_id = sorted(ami['Images'], key=lambda x: x['CreationDate'], reverse=True)[0]['ImageId']

        instancia = ec2.run_instances(
            ImageId=ami_id,
            InstanceType='t2.micro',
            MinCount=1,
            MaxCount=1,
            TagSpecifications=[{
                'ResourceType': 'instance',
                'Tags': [
                    {'Key': 'Name', 'Value': nombre_instancia},
                    {'Key': 'Proyecto', 'Value': 'CobranzaPro'},
                    {'Key': 'Creado', 'Value': str(datetime.date.today())}
                ]
            }]
        )
        id_nueva = instancia['Instances'][0]['InstanceId']
        print(f"  Instancia creada exitosamente: {id_nueva}")
        return id_nueva
    except ClientError as e:
        print(f"  Error al crear instancia: {e}")

def reporte_recursos():
    try:
        print("=" * 50)
        print("  REPORTE DE INFRAESTRUCTURA AWS")
        print("  Empresa: Soluciones Tecnologicas del Futuro")
        print("  Fecha:", datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        print("=" * 50)
        listar_s3()
        listar_ec2()
        print("\n" + "=" * 50)
    except NoCredentialsError:
        print("Error: No se encontraron credenciales AWS.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    reporte_recursos()
