import psycopg2

# Replace these with your database credentials
db_params = {
    'dbname': 'railway',
    'user': 'postgres',
    'password': '3f5agA6DaFf5EgcE1C2FbBd264d45dB5',
    'host': 'monorail.proxy.rlwy.net',
    'port': '24931',
}

# Establish a connection to the database
with psycopg2.connect(**db_params) as connection:
    with connection.cursor() as cursor:

        # Define the SQL query for creating the first table
        create_table1_query = '''
        CREATE TABLE medication_reminder_app_users (
            user_id SERIAL PRIMARY KEY,
            first_name TEXT,
            last_name TEXT,
            password TEXT,
            username TEXT,
            email TEXT
        );
        '''

        cursor.execute(create_table1_query)

        connection.commit()
        create_table2_query = '''
        CREATE TABLE medication_reminder_app_reminders (
            reminder_id BIGINT PRIMARY KEY,
            description TEXT,
            user_id INTEGER REFERENCES medication_reminder_app_users(user_id),
            reminder_time TIMESTAMP
        );
        '''
        cursor.execute(create_table2_query)
    connection.commit()
