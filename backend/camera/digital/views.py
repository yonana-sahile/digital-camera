from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action # <-- ADDED THIS IMPORT
from .models import CameraCapture
from .serializers import CameraCaptureSerializer

class CameraCaptureViewSet(viewsets.ModelViewSet):
    queryset = CameraCapture.objects.all().order_by('-timestamp')
    serializer_class = CameraCaptureSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(
                {"message": "Capture saved successfully", "data": serializer.data},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def latest(self, request):
        latest_capture = self.queryset.first()
        if latest_capture:
            serializer = self.get_serializer(latest_capture)
            return Response(serializer.data)
        return Response({"detail": "No captures found"}, status=status.HTTP_404_NOT_FOUND)
