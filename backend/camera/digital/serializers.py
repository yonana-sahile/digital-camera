from rest_framework import serializers
from .models import CameraCapture
import base64
import uuid
from django.core.files.base import ContentFile
from PIL import Image
import io

class Base64ImageField(serializers.ImageField):
    """
    A custom ImageField that accepts base64‑encoded image data.
    Works with Python 3.13+ (no dependency on imghdr).
    """
    def to_internal_value(self, data):
        # If it's a string and starts with data:image, treat as base64
        if isinstance(data, str) and data.startswith('data:image'):
            # Extract format and base64 payload
            format, imgstr = data.split(';base64,')
            ext = format.split('/')[-1]  # e.g., 'jpeg', 'png'
            decoded = base64.b64decode(imgstr)
            # Validate with Pillow (optional but recommended)
            try:
                img = Image.open(io.BytesIO(decoded))
                img.verify()  # checks integrity
            except Exception:
                raise serializers.ValidationError("Invalid image data")
            # Create a Django ContentFile
            file_name = f"{uuid.uuid4()}.{ext}"
            return ContentFile(decoded, name=file_name)
        # Fallback to default handling for regular file uploads
        return super().to_internal_value(data)

class CameraCaptureSerializer(serializers.ModelSerializer):
    image = Base64ImageField(required=True)

    class Meta:
        model = CameraCapture
        fields = ['id', 'image', 'timestamp']
