from django.db import models

class CameraCapture(models.Model):
    # 'captures/' is the subfolder inside your MEDIA_ROOT
    image = models.ImageField(upload_to='captures/%Y/%m/%d/')
    timestamp = models.DateTimeField(auto_now_add=True)
    label = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Capture {self.id} - {self.timestamp}"
