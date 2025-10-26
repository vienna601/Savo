import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

export default function EmotionGraph({ data }) {
  const chartData = {
    labels: data.map((d) => new Date(d.time).toLocaleTimeString()),
    datasets: [
      {
        label: "Confidence",
        data: data.map((d) => d.confidence),
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79,70,229,0.3)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
    ],
  };

  return (
    <div style={{ width: "100%", maxWidth: "640px", marginTop: "20px" }}>
      <Line data={chartData} />
    </div>
  );
}
