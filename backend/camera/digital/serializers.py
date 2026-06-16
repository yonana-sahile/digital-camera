# pip install django-extra-fields
from rest_framework import serializers
from drf_extra_fields.fields import Base64ImageField
from .models import CameraCapture

class CameraCaptureSerializer(serializers.ModelSerializer):
    # This automatically converts the Base64 string from React into a saved file
    image = Base64ImageField(required=True)

    class Meta:
        model = CameraCapture
        fields = ['id', 'image', 'timestamp']
