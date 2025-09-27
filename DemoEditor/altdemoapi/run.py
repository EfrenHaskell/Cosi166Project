import uvicorn

if __name__ == "__main__":
    print("""--------------------------\n
    Running demo api with uvicorn
    \n----------------------------
    """)
    uvicorn.run(app="api:api", host="localhost", port=9000, reload=True)
