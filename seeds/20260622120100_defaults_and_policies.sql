INSERT INTO default_preferences (notification_type, channel, enabled) VALUES
    ('transactional_email', 'email', true),
    ('transactional_sms', 'sms', true),
    ('transactional_push', 'push', true),
    ('marketing_email', 'email', false),
    ('marketing_sms', 'sms', false),
    ('marketing_push', 'push', false)
ON CONFLICT (notification_type, channel) DO NOTHING;

INSERT INTO global_policies (notification_type, channel, region, action) VALUES
    ('marketing_sms', 'sms', 'EU', 'deny'),
    ('marketing_email', 'email', 'EU', 'deny')
ON CONFLICT (notification_type, channel, region) DO NOTHING;
