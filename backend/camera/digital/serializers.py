from rest_framework import serializers
from .models import CameraCapture
import base64
import uuid
import re
from django.core.files.base import ContentFile
from PIL import Image
import io

class Base64ImageField(serializers.ImageField):
    """
    A custom ImageField that accepts base64‑encoded image data.
    Works with Python 3.13+ and does not rely on the deprecated 'imghdr' module.
    """
    def to_internal_value(self, data):
        # If the data is a string, try to parse it as a data URL
        if isinstance(data, str):
            # Check if it's a valid data URL
            match = re.match(r'^data:image/(?P<ext>\w+);base64,(?P<data>.+)$', data)
            if not match:
                raise serializers.ValidationError(
                    "Image must be a valid data URL (e.g., data:image/jpeg;base64,...)."
                )
            ext = match.group('ext')
            base64_data = match.group('data')
            try:
                decoded = base64.b64decode(base64_data)
            except Exception:
                raise serializers.ValidationError("Invalid base64 encoding.")
            # Validate with Pillow
            try:
                img = Image.open(io.BytesIO(decoded))
                img.verify()  # checks integrity
            except Exception:
                raise serializers.ValidationError("Invalid image content or corrupted data.")
            # Create a Django ContentFile
            file_name = f"{uuid.uuid4()}.{ext}"
            return ContentFile(decoded, name=file_name)
        # Fallback to default handling for regular file uploads (e.g., multipart form)
        return super().to_internal_value(data)

class CameraCaptureSerializer(serializers.ModelSerializer):
    image = Base64ImageField(required=True)

    class Meta:
        model = CameraCapture
        fields = ['id', 'image', 'timestamp']
