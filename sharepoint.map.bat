IF [%1] == [] (net use N: /d)
IF NOT [%1] == [] (net use N: %1)