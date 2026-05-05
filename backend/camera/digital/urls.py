from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CameraCaptureViewSet

router = DefaultRouter()
router.register(r'captures', CameraCaptureViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
