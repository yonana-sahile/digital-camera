from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import CameraCapture
from .serializers import CameraCaptureSerializer

class CameraCaptureViewSet(viewsets.ModelViewSet):
    queryset = CameraCapture.objects.all().order_by('-timestamp')
    serializer_class = CameraCaptureSerializer

    # Optional: Custom logic when a photo is saved
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
