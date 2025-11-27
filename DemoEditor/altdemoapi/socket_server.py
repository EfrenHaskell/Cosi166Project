import socket

port = 8000
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.bind(('', port))
sock.listen(10)
clients = []
while True:
    client, addr = sock.accept()
    clients.append(client)
