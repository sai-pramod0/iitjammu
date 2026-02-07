import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('backend/.env')

async def clear_db():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'enterprise_db')
    
    print(f"Connecting to {mongo_url}...")
    client = AsyncIOMotorClient(mongo_url)
    
    print(f"Dropping database: {db_name}...")
    await client.drop_database(db_name)
    
    print("Database cleared successfully.")
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_db())
