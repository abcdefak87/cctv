package models

import "time"

type Camera struct {
	ID             int       `json:"id" db:"id"`
	Name           string    `json:"name" db:"name"`
	PrivateRTSPURL string    `json:"private_rtsp_url,omitempty" db:"private_rtsp_url"`
	Description    string    `json:"description" db:"description"`
	Location       string    `json:"location" db:"location"`
	GroupName      string    `json:"group_name" db:"group_name"`
	AreaID         *int      `json:"area_id" db:"area_id"`
	Enabled        bool      `json:"enabled" db:"enabled"`
	StreamKey      string    `json:"stream_key" db:"stream_key"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}
