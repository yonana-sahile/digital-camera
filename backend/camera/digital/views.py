from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import CameraCapture
from .serializers import CameraCaptureSerializer


class CameraCaptureViewSet(viewsets.ModelViewSet):
    # Order by newest first so your React gallery stays updated
    queryset = CameraCapture.objects.all().order_by('-timestamp')
    serializer_class = CameraCaptureSerializer

    # Ensure the API can handle both JSON (Base64) and Form Data (Files)
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def create(self, request, *args, **kwargs):
        # You can add custom logic here, like auto-tagging or
        # triggering a security scan if this is for AdwaShield
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(
                {"message": "Capture saved successfully", "data": serializer.data},
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Optional: Action to get only the latest photo for a "Live Preview"
    def latest(self, request):
        latest_capture = self.queryset.first()
        if latest_capture:
            serializer = self.get_serializer(latest_capture)
            return Response(serializer.data)
        return Response({"detail": "No captures found"}, status=status.HTTP_404_NOT_FOUND)
