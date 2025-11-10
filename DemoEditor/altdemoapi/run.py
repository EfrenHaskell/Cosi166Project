import uvicorn
import socket

hostname = socket.gethostname()

if __name__ == "__main__":
    print("""--------------------------\n
    Running demo api with uvicorn
    \n----------------------------
    """)
    uvicorn.run(app="api:api", host="localhost", port=8000, reload=True)
