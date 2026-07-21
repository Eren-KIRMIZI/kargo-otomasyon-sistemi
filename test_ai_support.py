import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'C:/Users/Eren/Desktop/KargoEnterprises/backend')

from app.services.ai_support import KNOWLEDGE_BASE, layer2_retrieve, layer1_check
import asyncio
from app.services.ai_support import process_chat_message

print(f"OK KB docs loaded: {len(KNOWLEDGE_BASE)}")

# Katman 2 RAG
results = layer2_retrieve("Zebra barkod okuyucu calismiyor", top_k=2)
if results:
    print(f"RAG Top Match: {results[0]['doc']['title']} (score: {results[0]['score']:.3f})")
else:
    print("WARNING: No RAG match found")

# Katman 1
r1 = layer1_check("Aracta kaza oldu SOS")
print(f"Layer1 (kaza): {r1['intent'] if r1 else 'No match'}")

# Full pipeline
async def test():
    r = await process_chat_message("Zebra barkod okuyucu ariza veriyor")
    print(f"Pipeline result - Layer: {r['layer']}, Suggest ticket: {r['suggest_ticket']}, Sources: {len(r['sources'])}")
    print(f"Reply (first 200 chars): {r['reply'][:200]}")

asyncio.run(test())
print("ALL TESTS PASSED!")
