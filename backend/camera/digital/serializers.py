from rest_framework import serializers
from .models import CameraCapture

class CameraCaptureSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraCapture
        fields = ['id', 'image', 'timestamp', 'label']
