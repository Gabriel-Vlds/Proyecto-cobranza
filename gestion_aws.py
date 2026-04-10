import boto3
from botocore.exceptions import NoCredentialsError

def reporte_recursos():
    try:
        s3 = boto3.client('s3')
        ec2 = boto3.client('ec2')

        print("--- REPORTE DE INFRAESTRUCTURA AWS ---")

        print("\n[+] Listando Buckets S3:")
        buckets = s3.list_buckets()
        for bucket in buckets['Buckets']:
            print(f" - {bucket['Name']}")

        print("\n[+] Listando Instancias EC2:")
        instancias = ec2.describe_instances()
        for reservation in instancias['Reservations']:
            for instance in reservation['Instances']:
                print(f" - ID: {instance['InstanceId']} | Estado: {instance['State']['Name']}")

    except NoCredentialsError:
        print("Error: No se encontraron credenciales. Verifica el aws configure.")
    except Exception as e:
        print(f"Ocurrió un error: {e}")

if __name__ == "__main__":
    reporte_recursos()
