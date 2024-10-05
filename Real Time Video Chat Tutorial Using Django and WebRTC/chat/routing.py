from django.urls import path

from . import consumers

websocket_urlpatterns = [
    path('', consumers.AsyncWebsocketConsumer.as_asgi()),
]