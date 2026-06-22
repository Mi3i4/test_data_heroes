CREATE TABLE IF NOT EXISTS default_preferences (
    id BIGSERIAL PRIMARY KEY,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'transactional_email', 'marketing_email',
        'transactional_sms', 'marketing_sms',
        'transactional_push', 'marketing_push'
    )),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    enabled BOOLEAN NOT NULL,
    UNIQUE (notification_type, channel)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'transactional_email', 'marketing_email',
        'transactional_sms', 'marketing_sms',
        'transactional_push', 'marketing_push'
    )),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    enabled BOOLEAN NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, notification_type, channel)
);

CREATE TABLE IF NOT EXISTS user_quiet_hours (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS global_policies (
    id BIGSERIAL PRIMARY KEY,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'transactional_email', 'marketing_email',
        'transactional_sms', 'marketing_sms',
        'transactional_push', 'marketing_push'
    )),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    region TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action = 'deny'),
    UNIQUE (notification_type, channel, region)
);
