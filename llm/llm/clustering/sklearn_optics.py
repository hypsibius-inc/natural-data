from sklearn.cluster import OPTICS
model = OPTICS(metric="cosine", cluster_method="dbscan", xi=0.0001, min_samples=30, max_eps=2, n_jobs=-1)

__all__ = ["model"]
