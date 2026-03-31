def lambda_handler(event, context):
    try:
       print(f"lambda started")
       print(2+3)
       print(event)
       print(context)
    except Exception as e:   
        return e
